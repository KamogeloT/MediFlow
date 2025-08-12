import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { fetchDepartments, Department } from "@/lib/departments";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["doctor", "front-desk"]),
  departmentId: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "doctor", departmentId: "" },
  });

  const role = watch("role");

  // Fetch departments when component mounts
  useEffect(() => {
    const loadDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const deps = await fetchDepartments();
        setDepartments(deps);
      } catch (error) {
        console.error("Failed to load departments:", error);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(null);
    
    // Custom validation for doctors
    if (values.role === "doctor" && !values.departmentId) {
      setServerError("Doctors must select a department");
      return;
    }
    
    try {
      await signUp(values.email, values.password, values.name, values.role, values.departmentId);
      navigate("/dashboard");
    } catch (error: any) {
      setServerError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="Dr. John Doe" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="doctor@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <RadioGroup
          value={role}
          onValueChange={(val) => {
            setValue("role", val as "doctor" | "front-desk");
            // Clear department if switching to front-desk
            if (val === "front-desk") {
              setValue("departmentId", "");
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="doctor" id="doctor" />
            <Label htmlFor="doctor">Doctor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="front-desk" id="front-desk" />
            <Label htmlFor="front-desk">Front Desk Staff</Label>
          </div>
        </RadioGroup>
        <input type="hidden" {...register("role")}/>
        {errors.role && (
          <p className="text-sm text-red-500">{errors.role.message}</p>
        )}
      </div>

      {/* Department Selection for Doctors */}
      {role === "doctor" && (
        <div className="space-y-2">
          <Label htmlFor="department">
            Department <span className="text-red-500">*</span>
          </Label>
          {isLoadingDepartments ? (
            <p className="text-sm text-gray-500">Loading departments...</p>
          ) : departments.length > 0 ? (
            <Select value={watch("departmentId")} onValueChange={(value) => setValue("departmentId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-500">No departments available</p>
          )}
          <p className="text-xs text-gray-500">
            Select the department you will be working in
          </p>
          {errors.departmentId && (
            <p className="text-sm text-red-500">{errors.departmentId.message}</p>
          )}
        </div>
      )}

      {serverError && (
        <p className="text-sm text-red-500" role="alert">
          {serverError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
